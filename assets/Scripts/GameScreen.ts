import { _decorator, Component, Node, input, Input, EventKeyboard, KeyCode, Vec3, Collider2D, Contact2DType, IPhysics2DContact, Prefab, instantiate, Sprite, Color, tween, RigidBody2D, ERigidBody2DType, Label } from 'cc';
const { ccclass, property } = _decorator;

enum Popup {
    PlayGamePopup,
    EndGamePopup,
    ErrorPopup,
}

enum FallingObject {
    GoodObject,
    BadObject,
    Bomb,
}

@ccclass('GameScreen')
export class GameScreen extends Component {

    @property({type: Node})
    public Popups: Node[] = [];

    @property({type: Color})
    public Colors: Color[] = [];

    @property({type: Prefab})
    public FallingObjects: Prefab[] = [];

    @property({type: Node})
    public Paddle: Node = null;

    @property({type: Node})
    public Base: Node = null;

    @property({type: Label})
    public ScoreLabel: Label = null;

    @property({type: Label})
    public TotalScoreLabel: Label = null;

    @property({type: Node})
    public objectsParent: Node = null;

    speed: number = 1000;

    direction: number = 0;

    isFoundBomb: boolean = false;

    isMissedObject: boolean = false;

    isScoreMinus: boolean = false;

    score: number = 0;

    instantiationTime: number = 0;

    goodObjectRate: number = 0.4;

    badObjectRate: number = 0.7;

    start() {
       this.Popups[Popup.PlayGamePopup].active = true;
    }

    onClickPlayGame(){
        this.score = 0;
        this.instantiationTime = 4;
        this.ScoreLabel.string = this.score.toString();
        this.isFoundBomb = false;
        this.isMissedObject = false;
        this.isScoreMinus = false;
        this.Popups[Popup.PlayGamePopup].active = false;
        this.registerEvents();
        this.spawnFallingObjects();
    }

    onRestart(){
        this.Popups[Popup.EndGamePopup].active = false;
        this.Popups[Popup.ErrorPopup].active = false;
        this.onClickPlayGame();
    }

    registerEvents(){
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.Paddle.getComponent(Collider2D).on(Contact2DType.BEGIN_CONTACT, this.onBeginContactWithPaddle, this);
        this.Base.getComponent(Collider2D).on(Contact2DType.BEGIN_CONTACT, this.onBeginContactWithBase, this);
    }

    disableEvents(){
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.Paddle.getComponent(Collider2D).off(Contact2DType.BEGIN_CONTACT, this.onBeginContactWithPaddle, this);
        this.Base.getComponent(Collider2D).off(Contact2DType.BEGIN_CONTACT, this.onBeginContactWithBase, this);
    }

    onBeginContactWithPaddle(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null){

        let labelScore = otherCollider.node.getComponentInChildren(Label).string;

        if(otherCollider.tag == 2 || otherCollider.tag == 3){
            this.score += Number(labelScore);
            this.ScoreLabel.string = this.score.toString();
            this.setGravityOfObjects();
            if(this.score < 0){
                this.isScoreMinus = true;
                this.destroyAllObjects();
                this.disableEvents();
                this.Popups[Popup.ErrorPopup].active = true;
            }else{
                this.scheduleOnce(() => {
                    otherCollider.node.destroy();
                },0);
            }
        }else{
            this.isFoundBomb = true;
            this.destroyAllObjects();
            this.disableEvents();
            this.TotalScoreLabel.string = this.score.toString();
            this.Popups[Popup.EndGamePopup].active = true;
        }

    }

    onBeginContactWithBase(selfCollider: Collider2D, otherCollider: Collider2D, contact: IPhysics2DContact | null){
        
        if(otherCollider.tag == 2){
            this.isMissedObject = true;
            this.destroyAllObjects();
            this.disableEvents();
            this.TotalScoreLabel.string = this.score.toString();
            this.Popups[Popup.EndGamePopup].active = true;
        }else{
            this.scheduleOnce(() => {
                otherCollider.node.destroy();
            },0);
        }
    }

    spawnFallingObjects(){
        if(this.isFoundBomb || this.isMissedObject || this.isScoreMinus)
            return;
        let spawnValue = this.spawnObject();
        let objectValue = this.spawnObjectValue();
        let object = instantiate(this.FallingObjects[spawnValue]);
        let randPosition = this.randomPosition();
        object.setParent(this.objectsParent);
        if(spawnValue == FallingObject.GoodObject){
           object.getComponentInChildren(Label).string = `+${objectValue}`;
        }else if(spawnValue == FallingObject.BadObject){
            object.getComponentInChildren(Label).string = `-${objectValue}`;
        }
        this.setGravityOfObjects();
        object.setPosition(randPosition, 1010);
        object.getComponent(Sprite).color = this.Colors[this.randomColor()];
        this.scheduleOnce(() => {
            this.spawnFallingObjects();
        }, this.instantiationTime);
    }

    setGravityOfObjects(){
        this.objectsParent.children.forEach(object => {
            if(this.score > 50 && this.score < 100){
                this.goodObjectRate = 0.35;
                this.badObjectRate = 0.65;
                this.instantiationTime = 3;
                object.getComponent(RigidBody2D).gravityScale = 0.06;
            }else if(this.score > 100 && this.score < 150){
                this.goodObjectRate = 0.25;
                this.badObjectRate = 0.6;
                this.instantiationTime = 2;
                object.getComponent(RigidBody2D).gravityScale = 0.07;
            }else if(this.score > 150 && this.score < 200){
                this.goodObjectRate = 0.15;
                this.badObjectRate = 0.55;
                this.instantiationTime = 1;
                object.getComponent(RigidBody2D).gravityScale = 0.08;
            }else if(this.score > 200){
                this.goodObjectRate = 0.1;
                this.badObjectRate = 0.5;
                this.instantiationTime = 1;
                object.getComponent(RigidBody2D).gravityScale = 0.09;
            }
        });
    }

    spawnObject(){
        let randObject = Math.random();
        if(randObject < this.goodObjectRate){
            return FallingObject.GoodObject;
        }else if(randObject < this.badObjectRate){
            return FallingObject.BadObject;
        }else{
            return FallingObject.Bomb;
        }
    }

    destroyAllObjects(){
        this.scheduleOnce(() => {
            this.objectsParent.destroyAllChildren();
        },0);
    }

    randomColor(){
        return Math.floor(Math.random() * this.Colors.length);
    }

    spawnObjectValue(){
        return Math.floor(1 + (10 - (1) + 1) * Math.random());
    }

    randomPosition(){
        return Math.floor(-490 + (490 - (-490) + 1) * Math.random());
    }

    onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.ARROW_LEFT) this.direction = -1;
        else if (event.keyCode === KeyCode.ARROW_RIGHT) this.direction = 1;
    }

    onKeyUp(event: EventKeyboard) {
        if (event.keyCode === KeyCode.ARROW_LEFT || event.keyCode === KeyCode.ARROW_RIGHT) this.direction = 0;
    }

    update(deltaTime: number) {
        let newPos = this.Paddle.position.x + this.direction * this.speed * deltaTime;
        newPos = Math.min(390, Math.max(-390, newPos)); // Keep paddle within screen bounds
        this.Paddle.setPosition(new Vec3(newPos, this.Paddle.position.y, 0));
    }
}


